/*
 *  AWX - Ajax based Webinterface for XBMC
 *  Copyright (C) 2010  MKay
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>
 */


// TODO remove debug function
function objToStr(obj, indent) {
	var out = '';
	for (var e in obj) {
		if (typeof obj[e] == 'object') {
			out += indent + e + ":\n" + objToStr(obj[e], indent+'     ') + "\n";

		} else {
			out += indent + e + ": " + obj[e] + "\n";
		}
	}
	return out;
};



var xbmc = {};



(function($) {

	/* ########################### *\
	 |  xbmc-lib
	 |
	\* ########################### */
	$.extend(xbmc, {

		movieThumbType: 'Poster',
		tvshowThumbType: 'Banner',

		xbmcHasQuit: false,
		timeout: 10000,

		input: function(options) {
			var settings = {
				type: 'Select',
				onSuccess: null,
				onError: null
			};
			
			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Input.' + options.type + '", "id": 1}',
				settings.onSuccess,
				settings.onError
			);

			return true;
		},

		init: function(initContainer, callback) {
			xbmc.periodicUpdater.start();
			var timeout = parseInt(mkf.cookieSettings.get('timeout'));
			this.timeout = (isNaN(timeout) || timeout < 5 || timeout > 120)? 10000: timeout*1000;
			this.detectThumbTypes(initContainer, callback);
		},



		sendCommand: function(command, onSuccess, onError, onComplete, asyncRequest) {
			if (typeof asyncRequest === 'undefined')
				asyncRequest = true;

			if (!this.xbmcHasQuit) {
				$.ajax({
					async: asyncRequest,
					type: 'POST',
					url: './jsonrpc?awx',
					data: command,
					dataType: 'json',
					cache: false,
					timeout: this.timeout,
					success: function(result, textStatus, XMLHttpRequest) {

						// its possible to get here on timeouts. --> error
						if (XMLHttpRequest.readyState==4 && XMLHttpRequest.status==0) {
							if (onError) {
								onError({"error" : { "ajaxFailed" : true, "xhr" : XMLHttpRequest, "status" : textStatus }});
							}
							return;
						}

						// Example Error-Response: { "error" : { "code" : -32601, "message" : "Method not found." } }
						if (result.error) {
							if (onError) { onError(result); }
							return;
						}

						if (onSuccess) { onSuccess(result); }
					},
					error: function(XMLHttpRequest, textStatus, errorThrown) {
						if (onError) {
							onError({"error" : { "ajaxFailed" : true, "xhr" : XMLHttpRequest, "status" : textStatus, "errorThrown" : errorThrown }});
						}
					},
					complete: function(XMLHttpRequest, textStatus) {
						if (onComplete) { onComplete(); }
					}
				});
			}
		},



		getMovieThumbType: function() {
			return this.movieThumbType;
		},



		getTvShowThumbType: function() {
			return this.tvshowThumbType;
		},



		hasQuit: function() {
			return this.xbmcHasQuit;
		},



		setHasQuit: function() {
			this.xbmcHasQuit = true;
		},



		formatTime: function (seconds) {
			var hh = Math.floor(seconds / 3600);
			var mm = Math.floor((seconds - hh*3600) / 60);
			var ss = seconds - hh*3600 - mm*60;
			var result = '';
			if (hh > 0)
				result = (hh<10 ? '0' : '') + hh + ':';
			return  result + (mm<10 ? '0' : '') + mm + ':' + (ss<10 ? '0' : '') + ss ;
		},



		getSeconds: function (time) {
			var seconds = 0;
			var i = 0;
			while (time.length > 0) {
				var next = time.substr(time.length-2);
				seconds += Math.pow(60, i) * parseInt(next); // works for hours, minutes, seconds
				if (time.length > 0) {
					time = time.substr(0, time.length-3);
				}
				++i;
			}

			return seconds;
		},



		getThumbUrl: function(url) {
			return './vfs/' + encodeURI(url);
		},

		detectThumbTypes: function(initContainer, callback) {
			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetTVShows", "params": {"properties" : ["thumbnail"]}, "id": 1}',

				function (response) {
					if (response.result.tvshows) {
						var $img = $('<img />').appendTo(initContainer);
						$.each(response.result.tvshows, function(i, tvshow) {
							if (tvshow.thumbnail) {
								$img
									.bind('load', function() {
										if (this.width/this.height < 5) {
											xbmc.tvshowThumbType = 'Poster';
										} // else 'Banner'
										callback();
									})
									.bind('error', function() {
										// use default: 'Banner'
										callback(mkf.lang.get('message_failed_detect_thumb_type'));
									})
									.attr('src', xbmc.getThumbUrl(tvshow.thumbnail));

								return false;
							}
						});
					} else {
						// no tv shows
						callback();
					}
				},

				function (response) {
					callback(mkf.lang.get('message_failed_detect_thumb_type'));
				},

				null,
				false // not async
			);
		},

		scanVideoLibrary: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc":"2.0","id":2,"method":"VideoLibrary.Scan"}',
				settings.onSuccess,
				settings.onError
			);
		},
		
		scanAudioLibrary: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc":"2.0","id":2,"method":"AudioLibrary.Scan"}',
				settings.onSuccess,
				settings.onError
			);
		},
		
		setVolume: function(options) {
			var settings = {
				volume: 50,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Application.SetVolume", "params": { "volume": ' + settings.volume + '}, "id": 1}',
				settings.onSuccess,
				settings.onError
			);
		},



		shutdown: function(options) {
			var settings = {
				type: 'shutdown',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			var commands = {shutdown: 'System.Shutdown', quit: 'Application.Quit', suspend: 'System.Suspend', reboot: 'System.Reboot'};

			if (commands[settings.type]) {
				xbmc.sendCommand(
					'{"jsonrpc": "2.0", "method": "' + commands[settings.type] + '", "id": 1}',
					function () {
						xbmc.setHasQuit();
						settings.onSuccess();
					},
					settings.onError
				);
				return true;
			}

			return false;
		},



		control: function(options) {
			var settings = {
				type: 'play',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			var commands = {play: 'PlayPause', stop: 'Stop', prev: 'GoPrevious', next: 'GoNext', shuffle: 'Shuffle', unshuffle: 'Unshuffle'};

			if (commands[settings.type]) {
				xbmc.sendCommand(
					'{"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}',

					function (response) {

						if (response.result[0]) {
							xbmc.sendCommand(
								'{"jsonrpc": "2.0", "method": "Player.' + commands[settings.type] + '", "params": { "playerid": ' + response.result[0].playerid + ' }, "id": 1}',
								settings.onSuccess,
								settings.onError
							);
						}
					},
					settings.onError
				);
				return true;
			}
			return false;
		},



		seekPercentage: function(options) {
			var settings = {
				percentage: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}',

				function (response) {
					var playerResult = response.result;
					var player = '';

					if (playerResult[0].type == 'audio') {
						player = 'Audio';

					} else if (playerResult[0].type == 'video') {
						player = 'Video';

					} else {
						// No player is active
						return;
					}

					xbmc.sendCommand(
						//'{"jsonrpc": "2.0", "method": "' + player + 'Player.SeekPercentage", "params": ' + settings.percentage + ', "id": 1}',
						'{"jsonrpc": "2.0", "method": "Player.Seek", "params": {"value": ' + settings.percentage + ', "playerid": ' + playerResult[0].playerid + '}, "id": 1}',

						settings.onSuccess,
						settings.onError
					);
				},

				settings.onError
			);
		},



		getArtists: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "AudioLibrary.GetArtists", "params": {"sort": { "order": "ascending", "method": "artist" } }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		getArtistsAlbums: function(options) {
			var settings = {
				artistid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "AudioLibrary.GetAlbums", "params": { "artistid" : ' + settings.artistid + ', "properties": ["artist", "genre", "rating", "thumbnail"] }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		getAlbums: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			var order = mkf.cookieSettings.get('albumOrder')=='album'? 'label' : 'artist';

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "AudioLibrary.GetAlbums", "params": {"properties": ["artist", "genre", "rating", "thumbnail"], "sort": { "order": "ascending", "method": "' + order + '" } }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		addSongToPlaylist: function(options) {
			var settings = {
				songid: 0,
				onSuccess: null,
				onError: null,
				async: true
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": {"item": {"songid": ' + settings.songid + '}, "playlistid": 0}, "id": 1}',
				settings.onSuccess,
				settings.onError,
				null,
				settings.async
			);
		},



		addAudioFileToPlaylist: function(options) {
			var settings = {
				file: '',
				onSuccess: null,
				onError: null,
				async: true
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "item": {"file": "' + settings.file.replace(/\\/g, "\\\\") + '"}, "playlistid": 0 }, "id": 1}',
				settings.onSuccess,
				settings.onError,
				null,
				settings.async
			);
		},




		addAudioFolderToPlaylist: function(options) {
			var settings = {
				folder: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.getDirectory({
				media: 'Audio',
				directory: settings.folder.replace(/\\/g, "\\\\"),

				onSuccess: function(result) {
					var error = false;
					var files = result.files;
					if (files) {
						files.sort(function(a, b) {
							if (a.file < b.file) return -1;
							if (a.file > b.file) return 1;
							return 0;
						});
						$.each(files, function(i, file)  {
							xbmc.addAudioFileToPlaylist({
								'file': file.file,
								onError: function() {
									error = true;
								},
								async: false
							});
						});
					}
					if (error) {
						settings.onError(mkf.lang.get('message_failed_add_files_to_playlist'));
					} else {
						settings.onSuccess();
					}
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_folders_content'));
				}
			});
		},

		
		addAlbumToPlaylist: function(options) {
			var settings = {
				albumid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": {"item": {"albumid": ' + settings.albumid + '}, "playlistid": 0}, "id": 1}',
				
				function(response) {
					settings.onSuccess()
				},
				
				function(response) {
					settings.onError(mkf.lang.get('message_failed_albums_songs'));
				}
			);			
		},


		clearAudioPlaylist: function(options) {
			var settings = {
				onSuccess: null,
				onError: null,
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Clear", "params": { "playlistid": 0 }, "id": 1}',
				settings.onSuccess,
				settings.onError
			);
		},



		playAudio: function(options) {
			var settings = {
				item: 0,
				onSuccess: null,
				onError: null,
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Player.Open", "params" : { "item" : { "playlistid" : 0, "position": ' + settings.item + ' } }, "id": 1}',
				settings.onSuccess,
				function(response) {
					settings.onError(mkf.lang.get('message_failed_play' + 'settings.item'));
				}
			);
		},

		removeAudioPlaylistItem: function(options) {
			var settings = {
				item: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Remove", "params" : { "playlistid" : 0, "position": ' + settings.item + ' }, "id": 1}',
				settings.onSuccess,
				function(response) {
					settings.onError(mkf.lang.get('message_failed_remove' + 'settings.item'));
				}
			);
		},
		
		removeVideoPlaylistItem: function(options) {
			var settings = {
				item: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Remove", "params" : { "playlistid" : 1, "position" : ' + settings.item + ' }, "id": 1}',
				settings.onSuccess,
				function(response) {
					settings.onError(mkf.lang.get('message_failed_remove' + 'settings.item'));
				}
			);
		},


		playAlbum: function(options) {
			var settings = {
				albumid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearAudioPlaylist({
				onSuccess: function() {
					xbmc.addAlbumToPlaylist({
						albumid: settings.albumid,

						onSuccess: function() {
							xbmc.playAudio({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function(errorText) {
							settings.onError(errorText);
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		playSong: function(options) {
			var settings = {
				songid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearAudioPlaylist({
				onSuccess: function() {
					xbmc.addSongToPlaylist({
						songid: settings.songid,

						onSuccess: function() {
							xbmc.playAudio({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function() {
							settings.onError(mkf.lang.get('message_failed_add_song_to_playlist'));
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		playAudioFile: function(options) {
			var settings = {
				file: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearAudioPlaylist({
				onSuccess: function() {
					xbmc.addAudioFileToPlaylist({
						file: settings.file,

						onSuccess: function() {
							xbmc.playAudio({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function() {
							settings.onError(mkf.lang.get('message_failed_add_file_to_playlist'));
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		playAudioFolder: function(options) {
			var settings = {
				folder: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearAudioPlaylist({
				onSuccess: function() {
					xbmc.addAudioFolderToPlaylist({
						folder: settings.folder,

						onSuccess: function() {
							xbmc.playAudio({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function(errorText) {
							settings.onError(errorText);
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		getAlbumsSongs: function(options) {
			var settings = {
				albumid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "AudioLibrary.GetSongs", "params": { "albumid": ' + settings.albumid + ', "properties": ["artist", "track"] }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		getAudioPlaylist: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.GetItems", "params": { "properties": ["title", "album", "artist", "duration"], "playlistid": 0 }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		clearVideoPlaylist: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Clear", "params": { "playlistid": 1 }, "id": 1}',
				settings.onSuccess,
				settings.onError
			);
		},



		playVideo: function(options) {
			var settings = {
				item: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Player.Open", "params" : { "item" : { "playlistid" : 1, "position": ' + settings.item + ' } }, "id": 1}',
				settings.onSuccess,
				function(response) {
					settings.onError(mkf.lang.get('message_failed_play'));
				}
			);
		},



		addVideoFileToPlaylist: function(options) {
			var settings = {
				file: '',
				onSuccess: null,
				onError: null,
				async: true
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "item" : { "file": "' + settings.file.replace(/\\/g, "\\\\") + '"}, "playlistid": 1 }, "id": 1}',
				settings.onSuccess,
				settings.onError,
				null,
				settings.async
			);
		},



		addVideoFolderToPlaylist: function(options) {
			var settings = {
				folder: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);


			xbmc.getDirectory({
				media: 'Video',
				directory: settings.folder.replace(/\\/g, "\\\\"),

				onSuccess: function(result) {
					var error = false;
					var files = result.files;
					if (files) {
						files.sort(function(a, b) {
							if (a.file < b.file) return -1;
							if (a.file > b.file) return 1;
							return 0;
						});
						alert(objToStr(files,''));
						$.each(files, function(i, file)  {
							xbmc.addVideoFileToPlaylist({
								'file': file.file,
								onError: function() {
									error = true;
								},
								async: false
							});
						});
					}
					if (error) {
						settings.onError(mkf.lang.get('message_failed_add_files_to_playlist'));
					} else {
						settings.onSuccess();
					}
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_folders_content'));
				}
			});
		},



		addMovieToPlaylist: function(options) {
			var settings = {
				movieid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": {"item": {"movieid": ' + settings.movieid + '}, "playlistid": 1}, "id": 1}',
				settings.onSuccess,
				settings.onError,
				null,
				settings.async
			);
		},



		playMovie: function(options) {
			var settings = {
				movieid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearVideoPlaylist({
				onSuccess: function() {
					xbmc.addMovieToPlaylist({
						movieid: settings.movieid,

						onSuccess: function() {
							xbmc.playVideo({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function() {
							settings.onError(mkf.lang.get('message_failed_add_movie_to_playlist'));
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		playVideoFile: function(options) {
			var settings = {
				file: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearVideoPlaylist({
				onSuccess: function() {
					xbmc.addVideoFileToPlaylist({
						file: settings.file,

						onSuccess: function() {
							xbmc.playVideo({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function() {
							settings.onError(mkf.lang.get('message_failed_add_file_to_playlist'));
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		playVideoFolder: function(options) {
			var settings = {
				folder: '',
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearVideoPlaylist({
				onSuccess: function() {
					xbmc.addVideoFolderToPlaylist({
						folder: settings.folder,

						onSuccess: function() {
							xbmc.playVideo({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function(errorText) {
							settings.onError(errorText);
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},

		
		getMovies: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetMovies", "params": {"properties" : ["rating", "thumbnail", "playcount"], "sort": { "order": "ascending", "method": "label" } }, "id": 1}',
				//'{"jsonrpc": "2.0", "method": "VideoLibrary.GetMovies", "params": {"properties" : ["genre", "director", "plot", "title", "originaltitle", "runtime", "year", "rating", "thumbnail", "playcount", "file", "tagline", "set"], "sort": { "order": "ascending", "method": "label" } }, "id": 1}',
				function(response) {
					settings.onSuccess(response.result);
				},
				settings.onError
			);
		},


		getMovieInfo: function(options) {
			var settings = {
				movieid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetMovieDetails", "params": { "movieid": ' + settings.movieid + ', "properties": ["genre", "director", "plot", "title", "originaltitle", "runtime", "year", "rating", "thumbnail", "playcount", "file", "tagline", "set"] },  "id": 2}',
				function(response) {
					settings.onSuccess(response.result.moviedetails);
				},
				settings.onError
			);
		},
		
		

		addEpisodeToPlaylist: function(options) {
			var settings = {
				episodeid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": {"item": {"episodeid": ' + settings.episodeid + '}, "playlistid": 1}, "id": 1}',
				settings.onSuccess,
				settings.onError,
				null,
				settings.async
			);
		},



		playEpisode: function(options) {
			var settings = {
				episodeid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			this.clearVideoPlaylist({
				onSuccess: function() {
					xbmc.addEpisodeToPlaylist({
						episodeid: settings.episodeid,

						onSuccess: function() {
							xbmc.playVideo({
								onSuccess: settings.onSuccess,
								onError: function(errorText) {
									settings.onError(errorText);
								}
							});
						},

						onError: function() {
							settings.onError(mkf.lang.get('message_failed_add_episode_to_playlist'));
						}
					});
				},

				onError: function() {
					settings.onError(mkf.lang.get('message_failed_clear_playlist'));
				}
			});
		},



		getTvShows: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetTVShows", "params": { "properties": ["genre", "plot", "title", "originaltitle", "year", "rating", "thumbnail", "playcount"] }, "id": 1}',
				function(response) {
					settings.onSuccess(response.result);
				},
				settings.onError
			);
		},



		getSeasons: function(options) {
			var settings = {
				tvshowid: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetSeasons", "params": { "tvshowid": ' + settings.tvshowid + ', "properties": ["season", "playcount"]}, "id": 1}',
				function(response) {
					settings.onSuccess(response.result);
				},
				settings.onError
			);
		},



		getEpisodes: function(options) {
			var settings = {
				tvshowid: 0,
				season: 0,
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "VideoLibrary.GetEpisodes", "params": { "tvshowid": ' + settings.tvshowid + ', "season" : ' + settings.season + ', "properties": ["episode", "playcount"], "sort": { "order": "ascending", "method": "episode" } }, "id": 1}',
				function(response) {
					settings.onSuccess(response.result);
				},
				settings.onError
			);
		},



		getVideoPlaylist: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Playlist.GetItems", "params": { "properties": [ "runtime", "showtitle", "season", "title" ], "playlistid": 1}, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},



		getSources: function(options) {
			var settings = {
				media: 'Audio',
				onSuccess: null,
				onError: null,
				async: true
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Files.GetSources", "params" : { "media" : "' + (settings.media=='Audio'? 'music' : 'video') + '" }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError,
				null,
				settings.async
			);
		},

		
		getRecentlyAddedEpisodes: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc":"2.0","id":2,"method":"VideoLibrary.GetRecentlyAddedEpisodes","params":{ "limits": {"end": 25},"properties":["title","runtime","season","episode","showtitle","thumbnail","file","plot","playcount"]}} ',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},

		getRecentlyAddedMovies: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc":"2.0","id":2,"method":"VideoLibrary.GetRecentlyAddedMovies","params":{ "limits": {"end": 25},"properties":["title","originaltitle","runtime","thumbnail","file","year","plot","tagline","playcount","rating","genre","director"]}}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},
		
		getRecentlyAddedAlbums: function(options) {
			var settings = {
				onSuccess: null,
				onError: null
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc":"2.0","id":2,"method":"AudioLibrary.GetRecentlyAddedAlbums","params":{ "limits": {"end": 25},"properties":["thumbnail","genre","artist","rating"]}}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError
			);
		},

		
		getDirectory: function(options) {
			var settings = {
				media: 'Audio',
				directory: '',
				onSuccess: null,
				onError: null,
				async: true
			};
			$.extend(settings, options);

			xbmc.sendCommand(
				'{"jsonrpc": "2.0", "method": "Files.GetDirectory", "params" : { "directory" : "' + settings.directory.replace(/\\/g, "\\\\") + '", "media" : "' + (settings.media=='Audio'? 'music' : 'video') +'", "sort": { "order": "ascending", "method": "file" } }, "id": 1}',

				function(response) {
					settings.onSuccess(response.result);
				},

				settings.onError,
				null,
				settings.async
			);
		}



	}); // END xbmc



	$.extend(xbmc, {
		periodicUpdater: {
			volumeChangedListener: [],
			currentlyPlayingChangedListener: [],
			playerStatusChangedListener: [],
			progressChangedListener: [],
			
			addVolumeChangedListener: function(fn) {
				this.volumeChangedListener.push(fn);
			},

			addCurrentlyPlayingChangedListener: function(fn) {
				this.currentlyPlayingChangedListener.push(fn);
			},

			addPlayerStatusChangedListener: function(fn) {
				this.playerStatusChangedListener.push(fn);
			},

			addProgressChangedListener: function(fn) {
				this.progressChangedListener.push(fn);
			},

			firePlayerStatusChanged: function(status) {
				$.each(xbmc.periodicUpdater.playerStatusChangedListener, function(i, listener)  {
					listener(status);
				});
			},

			fireCurrentlyPlayingChanged: function(file) {
				$.each(xbmc.periodicUpdater.currentlyPlayingChangedListener, function(i, listener)  {
					listener(file);
				});
			},

			fireProgressChanged: function(progress) {
				$.each(xbmc.periodicUpdater.progressChangedListener, function(i, listener)  {
					listener(progress);
				});
			},

			start: function() {
				setTimeout($.proxy(this, "periodicStep"), 10);
			},

			periodicStep: function() {
				
				//Stop changed status firering by only setting vars once!
				if (typeof xbmc.periodicUpdater.lastVolume === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						lastVolume: -1,
					});
				}
				if (typeof xbmc.periodicUpdater.shuffleStatus === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						shuffleStatus: false,
					});
				}
				if (typeof xbmc.periodicUpdater.currentlyPlayingFile === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						currentlyPlayingFile: null,
					});
				}				
				if (typeof xbmc.periodicUpdater.progress === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						progress: '',
					});
				}
				if (typeof xbmc.periodicUpdater.playerStatus === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						playerStatus: 'stopped',
					});
				}
				//For highlighting current item in playlist
				if (typeof xbmc.periodicUpdater.curPlaylistNum === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						curPlaylistNum: 0,
					});
				}
				if (typeof xbmc.periodicUpdater.repeatStatus === 'undefined') {
					$.extend(xbmc.periodicUpdater, {
						repeatStatus: 'none',
					});
				}
				
				// ---------------------------------
				// ---      Volume Changes       ---
				// ---------------------------------
				// --- Currently Playing Changes ---
				// ---------------------------------
				if ((this.volumeChangedListener &&
					this.volumeChangedListener.length) ||
					(this.currentlyPlayingChangedListener &&
					this.currentlyPlayingChangedListener.length) ||
					(this.playerStatusChangedListener &&
					this.playerStatusChangedListener.length) ||
					(this.progressChangedListener &&
					this.progressChangedListener.length)) {

					var activePlayer = '';

					xbmc.sendCommand(
						//'{"jsonrpc": "2.0", "method": "XBMC.GetInfoLabels", "params" : {"labels": ["MusicPlayer.Title", "MusicPlayer.Album", "MusicPlayer.Artist", "Player.Time", "Player.Duration", "Player.Volume", "Playlist.Random", "VideoPlayer.Title", "VideoPlayer.TVShowTitle", "Player.Filenameandpath"]}, "id": 1}',
						'{"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}',

						function (response) {
							var playerActive = response.result;
							//need to cover slideshow
							if (playerActive == '') {
								activePlayer = 'none';
							} else {
								activePlayer = playerActive[0].type;
								activePlayerid = playerActive[0].playerid;
							}
						},
						
						function(response) {
							activePlayer = 'none'; // ERROR
						},

						null, false // not async
					);

					// has volume changed? Or first start?
					if (activePlayer != 'none' || xbmc.periodicUpdater.lastVolume == -1) {
						xbmc.sendCommand(
							'{"jsonrpc": "2.0", "method": "Application.GetProperties", "params": { "properties": [ "volume", "muted" ] }, "id": 1}',

							function (response) {
								var volume = response.result.volume;
								if (volume != xbmc.periodicUpdater.lastVolume) {
									xbmc.periodicUpdater.lastVolume = volume;
									$.each(xbmc.periodicUpdater.volumeChangedListener, function(i, listener)  {
									listener(volume);
								});
								}
							},

							null, false // not async
						);
					}

					// playing state					
					// We reached the end my friend... (of the playlist)
					if ( xbmc.periodicUpdater.playerStatus != 'stopped' && activePlayer == 'none') {
						xbmc.periodicUpdater.playerStatus = 'stopped';
						xbmc.periodicUpdater.firePlayerStatusChanged('stopped');
					}

					if (activePlayer != 'none') {
						var request = '';

						if (activePlayer == 'audio' || activePlayer == 'video' ) {
							request = '{"jsonrpc":"2.0","id":2,"method":"Player.GetProperties","params":{ "playerid":' + activePlayerid + ',"properties":["speed", "shuffled", "repeat"] } }'

						}/* else if (activePlayer == 'video') {
							request = '{"jsonrpc":"2.0","id":4,"method":"Player.GetProperties","params":{ "playerid":1,"properties":["speed", "shuffled", "repeat"] } }'
						}*/

						xbmc.sendCommand(
							request,

							function (response) {
								var currentPlayer = response.result;
								
								if (currentPlayer.speed != 0 && currentPlayer.speed != 1 ) {
									// not playing
									if (xbmc.periodicUpdater.playerStatus != 'stopped') {
										xbmc.periodicUpdater.playerStatus = 'stopped';
										xbmc.periodicUpdater.firePlayerStatusChanged('stopped');
									}

								} else if (currentPlayer.speed == 0 && xbmc.periodicUpdater.playerStatus != 'paused') {
									xbmc.periodicUpdater.playerStatus = 'paused';
									xbmc.periodicUpdater.firePlayerStatusChanged('paused');

								} else if (currentPlayer.speed == 1 && xbmc.periodicUpdater.playerStatus != 'playing') {
									xbmc.periodicUpdater.playerStatus = 'playing';
									xbmc.periodicUpdater.firePlayerStatusChanged('playing');
								}
								
								//shuffle status changed?
								shuffle = currentPlayer.shuffled;
								if (xbmc.periodicUpdater.shuffleStatus != shuffle) {
								xbmc.periodicUpdater.shuffleStatus = shuffle;
								xbmc.periodicUpdater.firePlayerStatusChanged(shuffle? 'shuffleOn': 'shuffleOff');
								}
								
								//TO DO repeat

							},

							null, null, false // not async
						);
					}
						// Get current item
					if (activePlayer != 'none') {
						var request = '';

						if (activePlayer == 'audio') {
							request = '{"jsonrpc": "2.0", "method": "Player.GetItem", "params": { "properties": ["title", "album", "artist", "duration", "thumbnail", "file"], "playerid": 0 }, "id": 1}';
							//requeststate = '{"jsonrpc":"2.0","id":2,"method":"Player.GetProperties","params":{ "playerid":0,"properties":["playlistid","position","percentage","totaltime","time","type","speed"] } }'

						} else if (activePlayer == 'video') {
							request = '{"jsonrpc": "2.0", "method": "Player.GetItem", "params": { "properties": ["title", "season", "episode", "duration", "showtitle", "thumbnail", "file"], "playerid": 1 }, "id": 1}';
							//requeststate = '{"jsonrpc":"2.0","id":4,"method":"Player.GetProperties","params":{ "playerid":1,"properties":["playlistid","position","percentage","totaltime","time","type","speed"] } }'
						}
					
						// Current file changed?
						xbmc.sendCommand(
							request,

							function (response) {
								var currentItem = response.result.item;
								if (xbmc.periodicUpdater.currentlyPlayingFile != currentItem.file) {
									xbmc.periodicUpdater.currentlyPlayingFile = currentItem.file;
									$.extend(currentItem, {
										xbmcMediaType: activePlayer
									});
									xbmc.periodicUpdater.fireCurrentlyPlayingChanged(currentItem);
								}
							},

							null, null, false // not async
						);
						
						xbmc.sendCommand(
							'{"jsonrpc": "2.0", "method": "Player.GetProperties", "params": { "properties": ["time", "totaltime", "position"], "playerid": ' + activePlayerid + ' }, "id": 1}',
							function (response) {
								var currentTimes = response.result;
								var curtime;
								var curruntime;
								var curPlayItemNum = currentTimes.position;
								
								//Get the number of the currently playing item in the playlist
								if (xbmc.periodicUpdater.curPlaylistNum != curPlayItemNum) {
									//Change highlights rather than reload playlist
									if (activePlayer == 'audio') {
										$("#apli"+xbmc.periodicUpdater.curPlaylistNum).attr("class","playlistItem");
										$("#apli"+curPlayItemNum).attr("class","playlistItemCur");
										xbmc.periodicUpdater.curPlaylistNum = curPlayItemNum;
										//awxUI.onMusicPlaylistShow();
									} else if (activePlayer == 'video') {
										$("#vpli"+xbmc.periodicUpdater.curPlaylistNum).attr("class","playlistItem");
										$("#vpli"+curPlayItemNum).attr("class","playlistItemCur");
										xbmc.periodicUpdater.curPlaylistNum = curPlayItemNum;
										//awxUI.onVideoPlaylistShow();
									}
										
								}
								
								curtime = (currentTimes.time.hours * 3600) + (currentTimes.time.minutes * 60) + currentTimes.time.seconds;
								curruntime = (currentTimes.totaltime.hours * 3600) + (currentTimes.totaltime.minutes * 60) + currentTimes.totaltime.seconds;
								curtimeFormat = xbmc.formatTime(curtime);
								curruntimeFormat = xbmc.formatTime(curruntime);
								time = curtimeFormat;
								if (xbmc.periodicUpdater.progress != time) {
									xbmc.periodicUpdater.fireProgressChanged({"time": time, total: curruntimeFormat});
									xbmc.periodicUpdater.progress = time;
								}
							},

							null, null, false // not async
						);
					}

				}

				setTimeout($.proxy(this, "periodicStep"), 5000);
			}
		} // END xbmc.periodicUpdater
	}); // END xbmc

})(jQuery);

